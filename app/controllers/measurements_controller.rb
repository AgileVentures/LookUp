class LookUp < Sinatra::Base

  post '/roofs/:id/measurements' do
    @roof.params_parser(params)
    @roof.set_capacities
    @roof.to_json
  end

end